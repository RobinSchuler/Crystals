/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.MouseInfo;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.font.TextAttribute;
import java.awt.image.BufferedImage;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.text.AttributedString;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.imageio.ImageIO;
import javax.swing.JFrame;

import sun.audio.AudioPlayer;
import sun.audio.AudioStream;

/**
 * 
 * @author Bern
 */
public class Fenster extends JFrame implements MouseListener, KeyListener
{
	static Welt w;
	Image leer, stein, schatten, eisen, fels, mithril, gold, kristall, erde, basis, rahmen, hud,
			hud2, hud3, icon, befehllaufen, befehlabbauen;
	public static float xPos = Welt.xBasis, yPos = Welt.yBasis;
	BufferedImage paintTo = new BufferedImage(1250, 1250, BufferedImage.TYPE_INT_ARGB);
	static ArrayList<Partikel> partikel = new ArrayList<>();
	public static Kreatur angewaehlt;
	int bauarbeiterNr = 0;
	static boolean umschalt = false;
	boolean hilfe = true;
	static boolean soundmachen = true;

	public static void soundLaden(String name)
	{
		if (soundmachen)
		{
			FileInputStream fin;
			AudioStream ain;
			try
			{
				fin = new FileInputStream("assets/" + name);
				ain = new AudioStream(fin);
				AudioPlayer.player.start(ain);
			}
			catch (Exception ex)
			{
				Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
			}
		}
	}

	public static void lokalersoundLaden(String name, float x, float y)
	{
		if (soundmachen)
		{
			if (xPos - 13.5f <= x && xPos + 13.5f >= x && yPos - 13.5f <= y && yPos + 13.5f >= y)
			{
				FileInputStream fin;
				AudioStream ain;
				try
				{
					fin = new FileInputStream("assets/" + name);
					ain = new AudioStream(fin);
					AudioPlayer.player.start(ain);
				}
				catch (Exception ex)
				{
					Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}
	}

	public Fenster(Welt w)
	{
		setDefaultCloseOperation(3);
		this.w = w;
		leer = bildLaden("leer.png");
		stein = bildLaden("stein.png");
		schatten = bildLaden("schatten.png");
		eisen = bildLaden("eisen.png");
		fels = bildLaden("fels.png");
		gold = bildLaden("gold.png");
		kristall = bildLaden("kristall.png");
		erde = bildLaden("erde.png");
		mithril = bildLaden("mithril.png");
		basis = bildLaden("basis3.png");
		rahmen = bildLaden("rahmen.png");
		hud = bildLaden("hud.png");
		hud2 = bildLaden("hud2.png");
		hud3 = bildLaden("hud3.png");
		icon = Welt.bildLaden("icon.png");
		befehllaufen = Welt.bildLaden("befehllaufen.png");
		befehlabbauen = Welt.bildLaden("befehlabbauen.png");
		setIconImage(icon);
		setBounds(0, 0, 625, 625);
		setResizable(true);
		addMouseListener(this);
		addKeyListener(this);

		MusicThread m = new MusicThread();
		m.start();

		w.initSpawnen();

		PaintThread paint = new PaintThread();
		paint.start();

		Animation a = new Animation();
		a.start();

		xPos = Welt.KAMERASTARTPUNKTX;
		yPos = Welt.KAMERASTARTPUNKTY;

		setVisible(true);
		while (true)
		{

			//temprär;
			/* if(Math.random() < 0.01f){
			     partikel.add(new Partikel(0, 0, 240, 230, 50,19300f));//gold
			     partikel.add(new Partikel(2, 0, 200, 200, 200,7860f));//eisen
			     partikel.add(new Partikel(3, 0, 65, 160, 210,21400f));//mithril
			     partikel.add(new Partikel(4, 0, 130, 120, 110,2800f));//stein
			     partikel.add(new Partikel(5, 0, 100, 50, 5,800f));//erde
			 }*/

			for (int i = 0; i < partikel.size(); i++)
			{
				if (i < partikel.size())
				{
					partikel.get(i).update();
					if (partikel.get(i).z <= 0)
					{
						partikel.remove(i);
					}
				}
			}

			for (int i = 0; i < w.viecher.size(); i++)
			{
				w.viecher.get(i).update(1);
			}
			double mouseX = MouseInfo.getPointerInfo().getLocation().getX();
			double mouseY = MouseInfo.getPointerInfo().getLocation().getY();
			if (mouseX >= getX() && mouseY >= getY() && mouseX < getX() + getWidth()
					&& mouseY < getY() + getHeight())
			{

				if (mouseX < getX() + getWidth() / 5)
				{
					xPos -= 0.01f;
				}
				else if (mouseX > getX() + getWidth() * 4 / 5)
				{
					xPos += 0.01f;
				}

				if (mouseY < getY() + getHeight() / 5)
				{
					yPos -= 0.01f;
				}
				else if (mouseY > getY() + getHeight() * 4 / 5)
				{
					yPos += 0.01f;
				}

			}

			try
			{
				Thread.sleep(1);
			}
			catch (InterruptedException ex)
			{
				Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
			}
		}
	}

	@Override
	public void mouseClicked(MouseEvent e)
	{
	}

	int mausX, mausY;

	@Override
	public void mousePressed(MouseEvent e)
	{
		int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
		int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
		int posX = (int) ((float) (e.getX()) / getWidth() * 25 + xPos - 13f - verschiebungx / 50f);
		int posY = (int) ((float) (e.getY()) / getHeight() * 25 + yPos - 13f - verschiebungy / 50f);
		//w.setBlock(posX, posY,Welt.BlockArt.LEER) ; nur zu testzwecken...
		//w.sichtbarkeitberechnenvon(posX, posY);

		/* int verschiebungx = (int)((xPos - (int)(xPos)) * 25 );
		  int verschiebungy = (int)((yPos - (int)(yPos)) * 25 );
		  (int)((kreatur.posX - xPos + 13f )*paintTo.getWidth()/25) + verschiebungx
		  (int)((kreatur.posY - yPos + 13f)*paintTo.getHeight()/25) + verschiebungy
		  */

		if (e.getButton() == 1)
		{
			for (Kreatur kreatur : w.viecher)
			{
				if (kreatur.posX - 1 < posX && kreatur.posX + 1 > posX
						&& kreatur.posY - 1 < posY && kreatur.posY + 1 > posY)
				{
					angewaehlt = kreatur;
				}
			}
		}
		else
		{
			mausX = posX;
			mausY = posY;

		}

	}

	public static void zwergabbauenLassen(int posX, int posY, Zwerg angewaehlt)
	{
		if (angewaehlt != null && posX >= 0 && posY >= 0 && posX < Welt.WELTWIDTH
				&& posY < Welt.WELTHEIGTH)
		{
			if (w.inhalt[posX][posY] == Welt.BlockArt.LEER)
			{
				if (umschalt)
					angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
							(int) angewaehlt.gibZielPosX(), (int) angewaehlt.gibZielPosY(),
							posX, posY));
				else
					angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
							(int) angewaehlt.posY, posX, posY));
			}
			else
			{
				int a = 0, b = 0;
				if ((posX - (int) angewaehlt.gibZielPosX())
						* (posX - (int) angewaehlt.gibZielPosX()) > (posY - (int) angewaehlt
						.gibZielPosY()) * (posY - (int) angewaehlt.gibZielPosY()))
				{
					if (posX - (int) angewaehlt.gibZielPosX() > 0)
						a--;
					else
						a++;
				}
				else
				{
					if (posY - (int) angewaehlt.gibZielPosY() > 0)
						b--;
					else
						b++;
				}
				if (w.inhalt[posX + a][posY + b] == Welt.BlockArt.LEER
						&& Welt.sichtbar[posX + a][posY + b])
				{
					if (umschalt)
						angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
								(int) angewaehlt.gibZielPosX(),
								(int) angewaehlt.gibZielPosY(), posX + a, posY + b));
					else
						angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
								(int) angewaehlt.posY, posX + a, posY + b));
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("abbauen", posX, posY));
				}
				else if (w.inhalt[posX][posY - 1] == Welt.BlockArt.LEER
						&& Welt.sichtbar[posX][posY - 1])
				{
					if (umschalt)
						angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
								(int) angewaehlt.gibZielPosX(),
								(int) angewaehlt.gibZielPosY(), posX, posY - 1));
					else
						angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
								(int) angewaehlt.posY, posX, posY - 1));
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("abbauen", posX, posY));
				}
				else if (w.inhalt[posX + 1][posY] == Welt.BlockArt.LEER
						&& Welt.sichtbar[posX + 1][posY])
				{
					if (umschalt)
						angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
								(int) angewaehlt.gibZielPosX(),
								(int) angewaehlt.gibZielPosY(), posX + 1, posY));
					else
						angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
								(int) angewaehlt.posY, posX + 1, posY));
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("abbauen", posX, posY));
				}
				else if (w.inhalt[posX - 1][posY] == Welt.BlockArt.LEER
						&& Welt.sichtbar[posX - 1][posY])
				{
					if (umschalt)
						angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
								(int) angewaehlt.gibZielPosX(),
								(int) angewaehlt.gibZielPosY(), posX - 1, posY));
					else
						angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
								(int) angewaehlt.posY, posX - 1, posY));
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("abbauen", posX, posY));
				}
				else if (w.inhalt[posX][posY + 1] == Welt.BlockArt.LEER
						&& Welt.sichtbar[posX][posY + 1])
				{
					if (umschalt)
						angewaehlt.anBefehlsKetteAnhaengen(w.wegBerechnen(
								(int) angewaehlt.gibZielPosX(),
								(int) angewaehlt.gibZielPosY(), posX, posY + 1));
					else
						angewaehlt.neueBefehlsKette(w.wegBerechnen((int) angewaehlt.posX,
								(int) angewaehlt.posY, posX, posY + 1));
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("abbauen", posX, posY));
				}
			}
		}
	}

	@Override
	public void mouseReleased(MouseEvent e)
	{
		int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
		int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
		int posX = (int) ((float) (e.getX()) / getWidth() * 25 + xPos - 13f - verschiebungx / 50f);
		int posY = (int) ((float) (e.getY()) / getHeight() * 25 + yPos - 13f - verschiebungy / 50f);
		if (e.getButton() != 1 && posX == mausX && posY == mausY && angewaehlt instanceof Zwerg)
		{
			zwergabbauenLassen(posX, posY, (Zwerg) angewaehlt);
		}
		else if (e.getButton() != 1 && angewaehlt instanceof Zwerg)
		{
			if (angewaehlt != null && angewaehlt instanceof Zwerg && posX >= 0 && posY >= 0
					&& posX < Welt.WELTWIDTH && posY < Welt.WELTHEIGTH && mausX >= 0
					&& mausY >= 0 && mausX < Welt.WELTWIDTH && mausY < Welt.WELTHEIGTH)
			{
				if (umschalt)
					angewaehlt.anBefehlsKetteAnhaengen(new Befehl("regionabbauen", posX, posY,
							mausX, mausY));
				else
				{
					ArrayList<Befehl> a = new ArrayList<Befehl>();
					a.add(new Befehl("regionabbauen", posX, posY, mausX, mausY));
					angewaehlt.neueBefehlsKette(a);
				}

			}
		}
	}

	@Override
	public void mouseEntered(MouseEvent e)
	{
	}

	@Override
	public void mouseExited(MouseEvent e)
	{
	}

	@Override
	public void keyTyped(KeyEvent e)
	{
	}

	@Override
	public void keyPressed(KeyEvent e)
	{
		if (e.getKeyCode() == KeyEvent.VK_SPACE)
		{
			xPos = Welt.xBasis;
			yPos = Welt.yBasis;
		}
		else if (e.getKeyCode() == KeyEvent.VK_S)
		{
			FileOutputStream fout = null;
			ObjectOutputStream oout = null;
			try
			{
				fout = new FileOutputStream("LastSave.welt");
				oout = new ObjectOutputStream(fout);
				oout.writeObject(w);
				oout.flush();
			}
			catch (IOException ex)
			{
				Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
			} /*finally {
				  try {
				      fout.close();
				  } catch (IOException ex) {
				      Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				  }
				  try {
				      oout.close();
				  } catch (IOException ex) {
				      Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				  }
				}*/
		}
		else if (e.getKeyCode() == KeyEvent.VK_SHIFT)
		{
			umschalt = true;
		}
		else if (e.getKeyCode() == KeyEvent.VK_D)
		{
			if (angewaehlt instanceof Zwerg)
			{

					System.out.println("poison");
					((Zwerg) angewaehlt).poison();

				
			}
		}

		else if (e.getKeyCode() == KeyEvent.VK_U)
		{
			angewaehlt = null;
		}
		else if (e.getKeyCode() == KeyEvent.VK_C)
		{
			if (w.GOLD >= 15)
			{
				Zwerg z = new Zwerg(Welt.xBasis, Welt.yBasis);
				w.viecher.add(z);
				w.ZWERGEANZAHL++;
				w.GOLD = w.GOLD - 15;
			}
		}

		else if (e.getKeyCode() == KeyEvent.VK_W)
		{
			if (w.MITHRIL >= 15 && Fenster.angewaehlt != null && angewaehlt instanceof Zwerg
					&& !((Zwerg) angewaehlt).hatHammer)
			{
				Welt.MITHRIL = Welt.MITHRIL - 15;
				((Zwerg) angewaehlt).mitHammerAusruesten();
			}

		}
		else if (e.getKeyCode() == KeyEvent.VK_A)
		{
			if (w.MITHRIL >= 15 && Fenster.angewaehlt != null && angewaehlt instanceof Zwerg
					&& !((Zwerg) angewaehlt).hatAxt)
			{
				Welt.MITHRIL = Welt.MITHRIL - 15;
				((Zwerg) angewaehlt).mitAxtAusruesten();
			}
		}
		else if (e.getKeyCode() == KeyEvent.VK_P)
		{
			if (w.EISEN >= 15 && Fenster.angewaehlt != null && angewaehlt instanceof Zwerg
					&& !((Zwerg) angewaehlt).hatHacke)
			{
				Welt.EISEN = Welt.EISEN - 15;
				((Zwerg) angewaehlt).mitHackeAusruesten();
			}
		}
		else if (e.getKeyCode() == KeyEvent.VK_H)
		{
			hilfe = !hilfe;
		}

		else if (e.getKeyCode() == KeyEvent.VK_L)
		{
			if (Fenster.angewaehlt != null
					&& w.GOLD >= Fenster.angewaehlt.level * Fenster.angewaehlt.level
					&& angewaehlt instanceof Zwerg)
			{
				Welt.GOLD = Welt.GOLD - Fenster.angewaehlt.level * Fenster.angewaehlt.level;
				((Zwerg) angewaehlt).levelup();
			}
		}
		else if (e.getKeyCode() == KeyEvent.VK_T)
		{
			bauarbeiterNr++;
			if (bauarbeiterNr >= w.viecher.size())
			{
				bauarbeiterNr -= w.viecher.size();
			}
			while (bauarbeiterNr < w.viecher.size()
					&& !(w.viecher.get(bauarbeiterNr) instanceof Zwerg))
			{
				bauarbeiterNr++;
				if (bauarbeiterNr >= w.viecher.size())
				{
					bauarbeiterNr -= w.viecher.size();
				}
			}
			if (bauarbeiterNr >= w.viecher.size())
			{
				bauarbeiterNr -= w.viecher.size();
			}
			angewaehlt = w.viecher.get(bauarbeiterNr);
			xPos = angewaehlt.posX;
			yPos = angewaehlt.posY;
		}
	}

	@Override
	public void keyReleased(KeyEvent e)
	{
		if (e.getKeyCode() == KeyEvent.VK_SHIFT)
		{
			umschalt = false;
		}
	}

	private class PaintThread extends Thread
	{

		@Override
		public void run()
		{
			while (!interrupted())
			{
				repaint();
				try
				{
					Thread.sleep(5);
				}
				catch (InterruptedException ex)
				{
					Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}

	}

	public boolean animation = true;

	private class Animation extends Thread
	{

		@Override
		public void run()
		{
			while (!interrupted())
			{
				try
				{
					animation = !animation;
					Thread.sleep(500);
				}
				catch (InterruptedException ex)
				{
					Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}

	}

	private class MusicThread extends Thread
	{

		@Override
		public void run()
		{
			while (!interrupted())
			{
				soundLaden("music_normal.wav");
				if (Math.random() > 0.9f)
				{
					soundLaden("music_enemy.wav");
				}
				try
				{
					Thread.sleep(2 * 60000 + 30000);
				}
				catch (InterruptedException ex)
				{
					Logger.getLogger(Fenster.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}

	}

	private void paintHelper(Graphics g)
	{
		Welt.BlockArt[][] ausgabe = w.gibBildschirm(xPos, yPos);
		for (int i = 0; i < 26; i++)
		{
			for (int j = 0; j < 26; j++)
			{
				int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
				int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
				int xanzeige = ((i) * paintTo.getWidth() / 25) - verschiebungx;
				int yanzeige = ((j) * paintTo.getHeight() / 25) - verschiebungy;
				switch (ausgabe[i][j])
				{
					case LEER:
						g.drawImage(leer, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case STEIN:
						g.drawImage(stein, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case MITHRIL:
						g.drawImage(mithril, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case SCHATTEN:
						g.drawImage(schatten, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case EISEN:
						g.drawImage(eisen, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case FELS:
						g.drawImage(fels, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case GOLD:
						g.drawImage(gold, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case KRISTALL:
						g.drawImage(kristall, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case ERDE:
						g.drawImage(erde, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case BASIS:
						g.drawImage(basis, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					case FALLE:
						g.drawImage(stein, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

					default:
						g.drawImage(fels, xanzeige, yanzeige, paintTo.getWidth() / 25,
								paintTo.getHeight() / 25, null);
						break;

				}
			}
		}
		int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
		int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
		if (angewaehlt != null)
		{
			g.drawImage(rahmen, (int) ((angewaehlt.posX - xPos + 13f) * paintTo.getWidth() / 25)
					+ verschiebungx - paintTo.getWidth() / 250,
					(int) ((angewaehlt.posY - yPos + 13f) * paintTo.getHeight() / 25)
							+ verschiebungy - paintTo.getHeight() / 250,
					paintTo.getWidth() * 12 / 250, paintTo.getHeight() * 12 / 250, null);
		}
		for (int i = 0; i < w.viecher.size(); i++)
		{
			Kreatur kreatur = w.viecher.get(i);
			if (kreatur.posX >= xPos - 13 && kreatur.posY >= yPos - 13
					&& kreatur.posX <= xPos + 13 && kreatur.posY <= yPos + 13)
			{
				verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
				verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
				g.drawImage(kreatur.gibBild(animation), (int) ((kreatur.posX - xPos + 13f)
						* paintTo.getWidth() / 25)
						+ verschiebungx,
						(int) ((kreatur.posY - yPos + 13f) * paintTo.getHeight() / 25)
								+ verschiebungy, paintTo.getWidth() / 25,
						paintTo.getHeight() / 25, null);
				if(kreatur instanceof Zwerg && kreatur.poisoned)
				{
					int magicX=(int) ((kreatur.posX - xPos + 13f)* paintTo.getWidth() / 25)
							+ verschiebungx;
					int magicY=(int) ((kreatur.posY - yPos + 13f) * paintTo.getHeight() / 25)
							+ verschiebungy;
					int radius = kreatur.illnesses.get(0).radius;
					g.drawOval(magicX-(int)Math.floor(radius/2)+25, magicY-(int)Math.floor(radius/2)+25, radius, radius);
				}
				if (kreatur.leben < kreatur.maxLeben)
				{
					int laenge = (int) (((float) kreatur.leben / kreatur.maxLeben) * 50);
					g.setColor(Color.red);
					g.fillRect((int) ((kreatur.posX - xPos + 13f) * paintTo.getWidth() / 25)
							+ verschiebungx,
							(int) ((kreatur.posY - yPos + 13f) * paintTo.getHeight() / 25)
									+ verschiebungy - 5, 50, 5);
					g.setColor(Color.green);
					g.fillRect((int) ((kreatur.posX - xPos + 13f) * paintTo.getWidth() / 25)
							+ verschiebungx,
							(int) ((kreatur.posY - yPos + 13f) * paintTo.getHeight() / 25)
									+ verschiebungy - 5, laenge, 5);
				}
			}
		}
	}

	private void paintPartikel(Graphics g)
	{
		int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
		int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
		for (int i = 0; i < partikel.size(); i++)
		{
			g.setColor(new Color(partikel.get(i).r, partikel.get(i).g, partikel.get(i).b));
			g.fillOval((int) ((partikel.get(i).x - xPos + 13f) * paintTo.getWidth() / 25)
					+ verschiebungx,
					(int) ((partikel.get(i).y - yPos + 13f) * paintTo.getHeight() / 25)
							+ verschiebungy,
					(int) (partikel.get(i).durchmesser * partikel.get(i).z),
					(int) (partikel.get(i).durchmesser * partikel.get(i).z));
			//g.fillOval( (int)paintTo.getWidth()/2, (int)paintTo.getHeight()/2, (int)partikel.get(i).durchmesser, (int)partikel.get(i).durchmesser);
		}
	}

	@Override
	public void paint(Graphics g)
	{
		paintHelper(paintTo.getGraphics());
		if (DynamicLightSettings.an)
			paintOverlaySchadows(paintTo.getGraphics());
		if (PartikelSettings.on)
			paintPartikel(paintTo.getGraphics());
		paintHeadupDisplay(paintTo.getGraphics());
		g.drawImage(paintTo, 0, 0, getWidth(), getHeight(), 0, 0, 1250, 1250, null);
	}

	public void paintOverlaySchadows(Graphics g)
	{
		int[][] array = new int[paintTo.getWidth() / DynamicLightSettings.granualitaet][paintTo
				.getHeight() / DynamicLightSettings.granualitaet];
		for (int i = 0; i < paintTo.getHeight() / DynamicLightSettings.granualitaet; i++)
		{
			Arrays.fill(array[i], DynamicLightSettings.maxShadow);
		}
		for (int i = 0; i < Welt.viecher.size(); i++)
		{
			if (Welt.viecher.get(i) instanceof Zwerg)
			{
				int verschiebungx = (int) ((xPos - (int) (xPos)) * 25);
				int verschiebungy = (int) ((yPos - (int) (yPos)) * 25);
				int posx = (int) ((Welt.viecher.get(i).posX - xPos + 13.5f)
						* paintTo.getWidth() / 25)
						+ verschiebungx;
				int posy = (int) ((Welt.viecher.get(i).posY - yPos + 13.5f)
						* paintTo.getHeight() / 25)
						+ verschiebungy - 5;
				overlayShadowsHelper(posx / DynamicLightSettings.granualitaet, posy
						/ DynamicLightSettings.granualitaet,
						((Zwerg) Welt.viecher.get(i)).lampenhelligkeit, array, xPos, yPos);
			}
		}
		for (int i = 0; i < paintTo.getWidth() / DynamicLightSettings.granualitaet; i++)
		{
			for (int j = 0; j < paintTo.getHeight() / DynamicLightSettings.granualitaet; j++)
			{
				g.setColor(new Color(
						(int) ((255 - array[i][j]) * DynamicLightSettings.rotscaling),
						(int) ((255 - array[i][j]) * DynamicLightSettings.gruenscaling),
						(int) ((255 - array[i][j]) * DynamicLightSettings.blauscaling),
						(int) array[i][j]));
				g.fillRect(i * DynamicLightSettings.granualitaet, j
						* DynamicLightSettings.granualitaet,
						DynamicLightSettings.granualitaet, DynamicLightSettings.granualitaet);
			}
		}
	}

	private void overlayShadowsHelper(int x, int y, float alpha, int[][] array, float xPos,
			float yPos)
	{
		if (x >= 0 && y >= 0 && x < paintTo.getWidth() / DynamicLightSettings.granualitaet
				&& y < paintTo.getHeight() / DynamicLightSettings.granualitaet
				&& alpha < DynamicLightSettings.maxShadow && array[x][y] > alpha)
		{
			array[x][y] = (int) alpha;
			float next = DynamicLightSettings.increaseShadow * DynamicLightSettings.granualitaet;
			int koordx = (int) (x * 25f * DynamicLightSettings.granualitaet / paintTo.getWidth()
					- 13 + xPos);
			int koordy = (int) (y * 25f * DynamicLightSettings.granualitaet
					/ paintTo.getHeight() - 13 + yPos);
			if (koordx >= 0 && koordy >= 0 && koordx < Welt.WELTWIDTH
					&& koordy < Welt.WELTHEIGTH)
			{
				if (!Welt.sichtbar[koordx][koordy]
						|| Welt.inhalt[koordx][koordy] != Welt.BlockArt.LEER)
				{
					next = DynamicLightSettings.increaseShadowinWall
							* DynamicLightSettings.granualitaet;
				}
			}
			float sqrt = (float) Math.sqrt((next * next) * 2);
			overlayShadowsHelper(x - 1, y, alpha + next, array, xPos, yPos);
			overlayShadowsHelper(x + 1, y, alpha + next, array, xPos, yPos);
			overlayShadowsHelper(x, y - 1, alpha + next, array, xPos, yPos);
			overlayShadowsHelper(x, y + 1, alpha + next, array, xPos, yPos);
			overlayShadowsHelper(x + 1, y + 1, alpha + sqrt, array, xPos, yPos);
			overlayShadowsHelper(x - 1, y + 1, alpha + sqrt, array, xPos, yPos);
			overlayShadowsHelper(x + 1, y - 1, alpha + sqrt, array, xPos, yPos);
			overlayShadowsHelper(x - 1, y - 1, alpha + sqrt, array, xPos, yPos);
		}
	}

	public void paintHeadupDisplay(Graphics g)
	{
		Graphics2D g2d = (Graphics2D) g;
		Font font = new Font("Arial", Font.BOLD, 22);
		Color color = new Color(170, 170, 170);
		g.setFont(font);
		g.setColor(color);

		/*   if(angewaehlt != null)
		   {
		   	g.drawImage(hud3, 0, 0, 1250, 1250, null);
		   }
		   */

		String s = " Gold = " + w.GOLD + "      Iron = " + w.EISEN + "      Mithril = "
				+ w.MITHRIL + "      Crystal = " + w.KRISTALLE + " of " + w.MAXIMA
				+ "      Population = " + w.ZWERGEANZAHL + "     ";
		//AttributedString a = new AttributedString (s);
		// a.addAttribute(TextAttribute.FONT, font);
		//   a.addAttribute(TextAttribute.FOREGROUND, Color.black);

		AttributedString b = new AttributedString(s);
		b.addAttribute(TextAttribute.FONT, font);
		b.addAttribute(TextAttribute.FOREGROUND, Color.black);
		int eisen = s.indexOf(" Iron = ");
		int mithril = s.indexOf(" Mithril = ");
		int crystals = s.indexOf(" Crystal = ");
		int pop = s.indexOf(" Population = ");
		int ende = s.length();
		FontMetrics metrics = getFontMetrics(font);

		String goldwidth = s.substring(0, eisen - 1);
		String eisenwidth = s.substring(eisen, mithril - 1);
		String mithrilwidth = s.substring(mithril, crystals - 1);
		String crystalwidth = s.substring(crystals, pop - 1);
		String popwidth = s.substring(pop, ende - 1);

		int goldw = metrics.stringWidth(goldwidth);
		int eisenw = metrics.stringWidth(eisenwidth) + 5;
		int mithrilw = metrics.stringWidth(mithrilwidth);
		int crystalw = metrics.stringWidth(crystalwidth);
		int popw = metrics.stringWidth(popwidth);
		g.setColor(new Color((int) 200, 200, 50));
		g.fillRoundRect(23, 53, goldw, 30, 30, 30);
		g.drawImage(icon, 23, 53, paintTo.getWidth() / 50, paintTo.getHeight() / 50, null);
		g.setColor(Color.darkGray);
		g.fillRoundRect(goldw + 28, 53, eisenw, 30, 30, 30);
		g.drawImage(icon, goldw + 28, 53, paintTo.getWidth() / 50, paintTo.getHeight() / 50, null);
		g.setColor(new Color((int) 90, 200, 255));
		g.fillRoundRect(goldw + eisenw + 33, 53, mithrilw, 30, 30, 30);
		g.drawImage(icon, goldw + eisenw + 33, 53, paintTo.getWidth() / 50,
				paintTo.getHeight() / 50, null);
		g.setColor(new Color((int) 150, 0, 0));
		g.fillRoundRect(goldw + eisenw + mithrilw + 38, 53, crystalw, 30, 30, 30);
		g.drawImage(icon, goldw + eisenw + mithrilw + 38, 53, paintTo.getWidth() / 50,
				paintTo.getHeight() / 50, null);
		g.setColor(new Color((int) 0, 150, 0));
		g.fillRoundRect(goldw + eisenw + mithrilw + crystalw + 43, 53, popw, 30, 30, 30);
		g.drawImage(icon, goldw + eisenw + mithrilw + crystalw + 43, 53, paintTo.getWidth() / 50,
				paintTo.getHeight() / 50, null);
		g.setColor(Color.white);

		/*a.addAttribute( TextAttribute.BACKGROUND , new Color ((int) 200,200,50),0,eisen-1 );
		a.addAttribute( TextAttribute.BACKGROUND, Color.darkGray,eisen,mithril-1);
		a.addAttribute( TextAttribute.BACKGROUND, new Color ((int) 90, 200, 255),mithril,crystals-1);
		a.addAttribute( TextAttribute.BACKGROUND, new Color ((int) 150,0,0),crystals,pop-1);
		a.addAttribute( TextAttribute.BACKGROUND, new Color ((int) 0,150,0),pop,ende-1); */

		// g.drawString (a.getIterator(),25,75);
		g.drawString(b.getIterator(), 45, 75);

		if (hilfe == false)
			g.drawString("Press H for Help", (paintTo.getWidth() - 200),
					(paintTo.getHeight() - 100));
		else
		{
			//g.drawImage(hud2, 0, 0, 1250, 1250, null);
			GradientPaint redtoblack = new GradientPaint(5, 50, Color.black, 150, 0, Color.red,
					true);
			g2d.setPaint(redtoblack);
			g.fillRoundRect((paintTo.getWidth() - 460), (paintTo.getHeight() - 380), 400, 340,
					30, 30);
			g.setColor(Color.white);
			g.drawString("W to equip Warhammer (15 Mithril)", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 200));
			g.drawString("A to equip Axe (15 Mithril)", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 170));
			g.drawString("P to equip Pickaxe (15 Iron)", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 140));
			g.drawString("U to unmark Dwarf", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 110));
			g.drawString("hold SHIFT for Multiple orders", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 80));
			g.drawString("C to create Dwarf (15 Gold)", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 50));
			g.drawString("L for lvlup", +(paintTo.getWidth() - 450), (paintTo.getHeight() - 320));
			g.drawString("SPACE to return to Base", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 290));
			g.drawString("T to cycle Dwarfs", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 260));
			g.drawString("H to toggle Help", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 230));
			g.drawString("S to save game", +(paintTo.getWidth() - 450),
					(paintTo.getHeight() - 350));

		}

		if (w.KRISTALLE >= Welt.MAXIMA)
		{
			g.drawString("Good Work, you have all crystals", (paintTo.getWidth() / 2 - 200),
					(paintTo.getHeight() / 2));
			//back to menu ?   
		}

		if (w.GOLD < 15 && w.ZWERGEANZAHL == 0)
		{
			g.drawString("Nicely Done, you failed", (paintTo.getWidth() / 2 - 200),
					(paintTo.getHeight() / 2));
			//back to menu ?   
		}

		if (angewaehlt != null)
		{
			GradientPaint bluetoblack = new GradientPaint(5, 50, Color.black, 150, 0,
					Color.blue, true);
			g2d.setPaint(bluetoblack);
			g.fillRoundRect((paintTo.getWidth() - 220), 50, 210, 310, 30, 30);
			g.setColor(Color.white);

			g.drawString("Armor = " + angewaehlt.ruestung, (paintTo.getWidth()) - 200,
					3 * 30 + 110);
			g.drawString("Life = " + angewaehlt.leben + " of " + angewaehlt.maxLeben,
					(paintTo.getWidth()) - 200, 1 * 30 + 110);
			g.drawString("Speed = " + (float) (int) ((angewaehlt.laufgeschwindigkeit) * 1000000)
					/ 1000, (paintTo.getWidth()) - 200, 6 * 30 + 110);
			g.drawString("Digtime = " + (float) (int) (angewaehlt.abbauzeit * 1000) / 1000,
					(paintTo.getWidth()) - 200, 7 * 30 + 110);
			g.drawString("Level = " + angewaehlt.level, (paintTo.getWidth()) - 200, 0 * 30 + 110);
			g.drawString("Damage = " + angewaehlt.schaden, (paintTo.getWidth()) - 200,
					2 * 30 + 110);
			g.drawString(
					"Attacktime = " + (float) (int) (angewaehlt.angriffszeit * 1000) / 1000,
					(paintTo.getWidth()) - 200, 4 * 30 + 110);
			g.drawString("Regtime = " + (float) (int) (angewaehlt.regenerationszeit * 1000)
					/ 1000, (paintTo.getWidth()) - 200, 5 * 30 + 110);

			if (angewaehlt instanceof Zwerg)
			{
				g.drawString("Lvlup costs = " + angewaehlt.level * angewaehlt.level,
						(paintTo.getWidth()) - 200, 8 * 30 + 110);
				if (((Zwerg) angewaehlt).hatAxt)
				{
					g.drawString("Axe", (paintTo.getWidth()) - 200, -1 * 30 + 110);
				}
				if (((Zwerg) angewaehlt).hatHacke)
				{
					g.drawString("Pickaxe", (paintTo.getWidth()) - 200, -1 * 30 + 110);
				}
				if (((Zwerg) angewaehlt).hatHammer)
				{
					g.drawString("Hammer", (paintTo.getWidth()) - 200, -1 * 30 + 110);
				}
			}
		}
	}

	public static Image bildLaden(String name)
	{
		FileInputStream fin;
		try
		{
			fin = new FileInputStream("assets/" + name);
			BufferedImage img = ImageIO.read(fin);
			return img;
		}
		catch (Exception ex)
		{
			Logger.getLogger(Welt.class.getName()).log(Level.SEVERE, null, ex);
			return null;
		}
	}

	/* static void Neuanfang () throws Exception
	{ 
	 	 try {

	         System.out.println("test");

	         
	         Process process = Runtime.getRuntime().exec("C:\Users\Robin\Desktop\Crystals\Crystals",null);
	        
	         System.out.println("test2");
	         
	      } catch (Exception ex) {
	         ex.printStackTrace();
	      }
	} */

}
