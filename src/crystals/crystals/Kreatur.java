/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.awt.Image;
import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;


public class Kreatur implements Serializable
{
	/**
	 * 
	 */
	private static final long serialVersionUID = 9088697885132486873L;
	int level = 1;
	float letztePosx, letztePosy;
	float posX, posY;
	float abbauzeit;
	int leben = 1, ruestung, schaden, maxLeben;
	float angriffszeit, regenerationszeit = 1000, laufgeschwindigkeit = 0.00005f;
	Image standS, standO, standW, standN, laufenS, laufenO, laufenW, laufenN, kampf;
	ArrayList<Befehl> weg = new ArrayList<>();
	char drectionlastmoved = 's';
	boolean poisoned = false;
	int timeSinceInfection = 0;
	ArrayList<Illness> illnesses = new ArrayList<>();

	public Kreatur()
	{
	}

	void loadSprite(String name)
	{
		standN = Welt.bildLaden(name + "hinten.png");
		standS = Welt.bildLaden(name + "vor.png");
		standO = Welt.bildLaden(name + "rechts.png");
		standW = Welt.bildLaden(name + "links.png");
		laufenN = Welt.bildLaden(name + "hintenlaufen.png");
		laufenS = Welt.bildLaden(name + "vorlaufen.png");
		laufenO = Welt.bildLaden(name + "rechtslaufen.png");
		laufenW = Welt.bildLaden(name + "linkslaufen.png");
		kampf = Welt.bildLaden(name + "aktion.png");
	}

	private void writeObject(java.io.ObjectOutputStream stream) throws IOException
	{
		stream.writeInt(level);
		stream.writeInt(ruestung);
		stream.writeInt(schaden);
		stream.writeInt(maxLeben);
		stream.writeFloat(abbauzeit);
		stream.writeFloat(angriffszeit);
		stream.writeFloat(regenerationszeit);
		stream.writeFloat(laufgeschwindigkeit);
		stream.writeFloat(letztePosx);
		stream.writeFloat(letztePosy);
		stream.writeFloat(posX);
		stream.writeFloat(posY);
		stream.writeInt(leben);
		stream.writeInt(weg.size());
		for (int i = 0; i < weg.size(); i++)
		{
			stream.writeObject(weg.get(i));
		}
	}

	private void readObject(java.io.ObjectInputStream stream) throws IOException,
			ClassNotFoundException
	{
		level = stream.readInt();
		ruestung = stream.readInt();
		schaden = stream.readInt();
		maxLeben = stream.readInt();
		abbauzeit = stream.readFloat();
		angriffszeit = stream.readFloat();
		regenerationszeit = stream.readFloat();
		laufgeschwindigkeit = stream.readFloat();
		letztePosx = stream.readFloat();
		letztePosy = stream.readFloat();
		posX = stream.readFloat();
		posY = stream.readFloat();
		leben = stream.readInt();
		int s = stream.readInt();
		weg = new ArrayList<>();
		for (int i = 0; i < s; i++)
		{
			weg.add((Befehl) (stream.readObject()));
		}
		Regenerieren r = new Regenerieren();
		r.start();
		timeSinceInfection = 0;
		illnesses = new ArrayList<>();
	}

	public Kreatur(int x, int y)
	{
		posX = x;
		letztePosx = x;
		posY = y;
		letztePosy = y;
		Welt.kreaturAnmelden(this, (int) posX, (int) posY);
		Regenerieren r = new Regenerieren();
		r.start();
	}

	public void poison()
	{

		//add new Illness to array
		Illness illness  = new Illness();
		System.out.println("poison called"+ illness + illnesses + this.illnesses);
		illnesses.add(illness);
		if(poisoned!=true)
		{
			//start only on first illness
			poisoned=true;
			Poison r = new Poison(this);
			r.start();		
		}

	}
	public void poison(Illness illness)
	{
		System.out.println("add ilness");
		//add new Illness to array
		this.illnesses.add(illness);
		if(poisoned!=true)
		{
			//start only on first illness
			poisoned=true;
			Poison r = new Poison(this);
			r.start();		
		}
	}
	
	public void update(float fps)
	{
		if (!weg.isEmpty())
		{
			if (weg.get(0).art.equals("laufen"))
			{
				if (posX == weg.get(0).x && posY == weg.get(0).y)
				{
					weg.remove(0);
				}
				else
				{
					if (weg.get(0).x > posX)
					{
						posX += laufgeschwindigkeit;
						drectionlastmoved = 'o';
					}
					if (weg.get(0).x < posX)
					{
						posX -= laufgeschwindigkeit;
						drectionlastmoved = 'w';
					}
					if (weg.get(0).y < posY)
					{
						posY -= laufgeschwindigkeit;
						drectionlastmoved = 'n';
					}
					if (weg.get(0).y > posY)
					{
						posY += laufgeschwindigkeit;
						drectionlastmoved = 's';
					}
					if (weg.get(0).x > posX - laufgeschwindigkeit
							&& weg.get(0).x < posX + laufgeschwindigkeit)
					{
						posX = weg.get(0).x;
					}
					if (weg.get(0).y > posY - laufgeschwindigkeit
							&& weg.get(0).y < posY + laufgeschwindigkeit)
					{
						posY = weg.get(0).y;
					}
				}
			}
			else if (!weg.isEmpty() && weg.get(0).art.equals("abbauen"))
			{
				Befehl b = weg.remove(0);
				Befehl b2 = new Befehl("warten", 0, 0);
				weg.add(0, b2);
				Abbauen abb = new Abbauen(b, b2);
				abb.start();
			}
			else if (!weg.isEmpty() && weg.get(0).art.equals("regionabbauen"))
			{
				Befehl b = weg.remove(0);
				int x = 0;
				int y = 0;
				boolean iwasmachbar = false;
				for (int i = b.x; i <= b.x2; i++)
				{
					for (int j = b.y; j <= b.y2; j++)
					{
						if (Welt.sichtbar[i][j] && Welt.inhalt[i][j] != Welt.BlockArt.LEER
								&& Welt.inhalt[i][j] != Welt.BlockArt.FELS
								&& Welt.inhalt[i][j] != Welt.BlockArt.BASIS)
						{
							iwasmachbar = true;
							x = i;
							y = j;
						}
					}
				}
				if (iwasmachbar)
				{
					Fenster.zwergabbauenLassen(x, y, (Zwerg) this);
					weg.add(b);
				}
			}
		}
		if (weg.isEmpty() && !(this instanceof Zwerg))
		{
			int xplus = (int) posX + (int) (Math.random() * 20 - 10);
			int yplus = (int) posY + (int) (Math.random() * 20 - 10);
			if (xplus < 0)
			{
				xplus = 0;
			}
			if (yplus < 0)
			{
				yplus = 0;
			}
			if (yplus >= Welt.WELTHEIGTH)
			{
				yplus = Welt.WELTHEIGTH - 1;
			}
			if (xplus >= Welt.WELTWIDTH)
			{
				xplus = Welt.WELTWIDTH - 1;
			}
			this.neueBefehlsKette(Welt.wegBerechnen((int) posX, (int) posY, xplus, yplus));
		}
		if (weg.isEmpty() || !weg.get(0).art.equals("warten"))
		{
			ArrayList<Kreatur> gegner = Welt.gegnerGeben((int) (posX), (int) (posY));
			if (this instanceof Zwerg)
			{
				while (!gegner.isEmpty() && gegner.get(0) instanceof Zwerg)
				{
					gegner.remove(0);
				}
				if (!gegner.isEmpty())
				{
					Kreatur anzugreifen = gegner.get(0);
					Befehl b2 = new Befehl("warten", 0, 0);
					weg.add(0, b2);
					Angreifen a = new Angreifen(this, anzugreifen, b2);
					a.start();
				}
			}
			else
			{
				while (!gegner.isEmpty() && !(gegner.get(0) instanceof Zwerg))
				{
					gegner.remove(0);
				}
				if (!gegner.isEmpty())
				{
					Kreatur anzugreifen = gegner.get(0);
					Befehl b2 = new Befehl("warten", 0, 0);
					weg.add(0, b2);
					Angreifen a = new Angreifen(this, anzugreifen, b2);
					a.start();
				}
			}
		}

		if ((int) (letztePosx) != (int) (posX) || (int) (letztePosy) != (int) (posY))
		{
			if (Welt.kreaturAbmelden(this, (int) letztePosx, (int) letztePosy))
			{
				Welt.kreaturAnmelden(this, (int) posX, (int) posY);
			}
			else
			{
				posX = letztePosx;
				posY = letztePosy;
			}
		}
		letztePosx = posX;
		letztePosy = posY;
	}

	private class Abbauen extends Thread
	{
		Befehl b;
		Befehl warten;

		@Override
		public void run()
		{
			super.run();
			try
			{
				if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.ERDE)
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 500))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
							for (int i = 0; i < 3; i++)
							{
								Fenster.partikel.add(new Partikel(b.x, b.y, 100, 50, 5,
										800f, 5));
							}
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 500) - sleeptime);
					}
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.STEIN)
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 1_000))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
							for (int i = 0; i < 3; i++)
							{
								Fenster.partikel.add(new Partikel(b.x, b.y, 130, 120, 110,
										2800f, 7));
							}
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 1_000) - sleeptime);
					}
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.GOLD)
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 1_000))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
							for (int i = 0; i < 3; i++)
							{
								Fenster.partikel.add(new Partikel(b.x, b.y, 240, 230, 50,
										19300f, 7));
							}
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 1_000) - sleeptime);
					}
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.EISEN)
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 1_000))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
							for (int i = 0; i < 3; i++)
							{
								Fenster.partikel.add(new Partikel(b.x, b.y, 200, 200, 200,
										7860f, 7));
							}
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 1_000) - sleeptime);
					}
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.MITHRIL)
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 1_000))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
							for (int i = 0; i < 3; i++)
							{
								Fenster.partikel.add(new Partikel(b.x, b.y, 65, 160, 210,
										21400f, 7));
							}
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 1_000) - sleeptime);
					}
				}
				else
				{
					int sleeptime = 0;
					while (sleeptime + 1000 < (int) (abbauzeit * 1_000))
					{
						if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
						{
							Fenster.lokalersoundLaden("abbau.wav", b.x, b.y);
						}
						sleeptime += 1000;
						Thread.sleep(1000);
					}
					if ((int) (abbauzeit * 1_000) > sleeptime)
					{
						Thread.sleep((int) (abbauzeit * 1_000) - sleeptime);
					}
				}
			}
			catch (InterruptedException ex)
			{
				Logger.getLogger(Kreatur.class.getName()).log(Level.SEVERE, null, ex);
			}
			if (!weg.isEmpty() && weg.get(0) == warten && leben > 0
					&& Welt.inhalt[b.x][b.y] == Welt.BlockArt.FELS)
			{
				weg.remove(0);
			}
			else if (!weg.isEmpty() && weg.get(0) == warten && leben > 0
					&& Welt.inhalt[b.x][b.y] == Welt.BlockArt.BASIS)
			{
				weg.remove(0);
			}
			else if (!weg.isEmpty() && weg.get(0) == warten && leben > 0)
			{
				weg.remove(0);
				if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.EISEN)
				{
					Fenster.lokalersoundLaden("pick-up.wav", b.x, b.y);
					Welt.EISEN += (int) (Math.random() * 3 + 3);
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.GOLD)
				{
					Fenster.lokalersoundLaden("pick-up.wav", b.x, b.y);
					Welt.GOLD += (int) (Math.random() * 5 + 3);
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.MITHRIL)
				{
					Fenster.lokalersoundLaden("pick-up.wav", b.x, b.y);
					Welt.MITHRIL += (int) (Math.random() * 3 + 3);
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.KRISTALL)
				{
					Fenster.lokalersoundLaden("pick-up.wav", b.x, b.y);
					Welt.KRISTALLE++;
				}
				else if (Welt.inhalt[b.x][b.y] == Welt.BlockArt.FALLE)
				{
					Fenster.soundLaden("lose.wav");
					if (Math.random() > 0.7)
					{
						stirb();
					}
					else if (Math.random() > 0.5)
					{
						for (int i = -10; i < 10; i++)
						{
							for (int j = -10; j < 10; j++)
							{
								if (b.x + i >= 0 && b.x + i < Welt.WELTWIDTH
										&& b.y + j >= 0 && b.y + j < Welt.WELTHEIGTH)
								{
									for (int f = 0; f < Welt.kreaturen[b.x + i][b.y + j]
											.size(); f++)
									{
										Kreatur k = Welt.kreaturen[b.x + i][b.y + j]
												.get(f);
										k.leben /= 2;
										if (k.leben <= 0)
										{
											k.stirb();
										}
									}
								}
							}
						}
					}

				}
				Welt.inhalt[b.x][b.y] = Welt.BlockArt.LEER;
				Welt.sichtbarkeitberechnenvon(b.x, b.y);
			}
		}

		public Abbauen(Befehl b, Befehl warten)
		{
			this.b = b;
			this.warten = warten;
		}
	}

	public void stirb()
	{
		if (Welt.viecher.contains(this))
		{
			Welt.kreaturen[(int) posX][(int) posY].remove(this);
			while (Welt.viecher.contains(this))
			{
				Welt.viecher.remove(this);
			}
			if (this instanceof Zwerg)
			{
				Welt.ZWERGEANZAHL--;
			}
			if (Fenster.angewaehlt == this)
			{
				Fenster.angewaehlt = null;
			}
		}
	}

	private class Angreifen extends Thread
	{
		Kreatur b;
		Kreatur a;
		Befehl warten;

		@Override
		public void run()
		{
			super.run();
			try
			{
				Thread.sleep((int) (a.angriffszeit * 1000));
				for (int i = 0; i < 3; i++)
				{
					Fenster.partikel.add(new Partikel((int) a.posX, (int) a.posY, 250, 10, 10,
							21400f, 7));
				}
				if (weg.get(0) == warten && leben > 0)
				{
					

					Fenster.lokalersoundLaden("abbau.wav", b.posX, b.posY);
					if (b.leben <= 0)
					{
						b.stirb();
						weg.remove(0);
					}
					else
					{
						Angreifen ang = new Angreifen(a, b, warten);
						ang.start();
					}
				}
			}
			catch (InterruptedException ex)
			{
				Logger.getLogger(Kreatur.class.getName()).log(Level.SEVERE, null, ex);
			}
		}

		public Angreifen(Kreatur a, Kreatur b, Befehl warten)
		{
			this.b = b;
			this.a = a;
			this.warten = warten;
		}

	}

	class Regenerieren extends Thread
	{
		@Override
		public void run()
		{
			while (regenerationszeit != 0)
			{
				super.run();
				try
				{
					Thread.sleep((int) (regenerationszeit * 1000));
					if (leben > 0 && leben < maxLeben)
					{
						leben++;
					}
				}
				catch (InterruptedException ex)
				{
					Logger.getLogger(Kreatur.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}

		public Regenerieren()
		{
		}

	}
	
	class Poison extends Thread
	{
		Kreatur kreatur;
		@Override
		public void run()
		{
			while (poisoned)
			{
				super.run();
				try
				{
					Thread.sleep((int) (1000));
					timeSinceInfection+=1000;
					System.out.println("poisoned");
					int[] distances=new int[Welt.viecher.size()];
				    ArrayList<Kreatur> viecher = Welt.viecher;
				    
					for (int i = 0; i<viecher.size();i++)
					{
						distances[i]=calculateDistance(posX, posY, viecher.get(i).posX, viecher.get(i).posY);
					}
					for (int i = 0; i<illnesses.size();i++)
					{
						Illness illness = illnesses.get(i);
						for (int j = 0; j<distances.length;j++)
						{
							if(distances[j]<illness.radius)
							{
								//try to infect
								boolean getsInfected = diceInfected(illness.infectionProbability);
								boolean breaksOut = diceBreakout(illness.breakoutProbability);
								if(getsInfected&&breaksOut&&!viecher.get(j).equals(kreatur))
									viecher.get(j).poison(illness);
							}
							
						}
						if(timeSinceInfection > (illness.infectionDuration+illness.infectionDuration))
						{
							illnesses.remove(illness);
							timeSinceInfection=0;
						}
						if(illnesses.size()==0)
							poisoned=false;
					}							
				}
				catch (InterruptedException ex)
				{
					Logger.getLogger(Kreatur.class.getName()).log(Level.SEVERE, null, ex);
				}
			}
		}
		
		private boolean diceBreakout(int breakoutProbability) {
			return true;
		}

		private boolean diceInfected(int infectionProbability) {
			return true;
		}

		private int calculateDistance(float x1, float y1, float x2, float y2)
		{		
			return (int)Math.floor(Math.sqrt(Math.pow((double)Math.abs(x1-x2), 2)+Math.pow((double)Math.abs(y1-y2), 2)));
		}

		public Poison(Kreatur kreatur)
		{
			this.kreatur=kreatur;
		}

	}

	public void neueBefehlsKette(ArrayList<Befehl> weg)
	{
		this.weg = weg;
	}

	public void anBefehlsKetteAnhaengen(ArrayList<Befehl> weg)
	{
		this.weg.addAll(weg);
	}

	public void anBefehlsKetteAnhaengen(Befehl b)
	{
		weg.add(b);
	}

	public void levelup()
	{

	}

	public Image gibBild(boolean timer)
	{
		if (timer)
		{
			if (!weg.isEmpty() && weg.get(0).art.equals("warten"))
			{
				return standS;
			}
			else
				switch (drectionlastmoved)
				{
					case 's':
						return standS;
					case 'n':
						return standN;
					case 'w':
						return standW;
					case 'o':
						return standO;
				}
		}
		else if (weg.isEmpty() || !weg.get(0).art.equals("warten"))
		{
			switch (drectionlastmoved)
			{
				case 's':
					return laufenS;
				case 'n':
					return laufenN;
				case 'w':
					return laufenW;
				case 'o':
					return laufenO;
			}
		}
		else if (!weg.isEmpty() && weg.get(0).art.equals("warten"))
			return kampf;
		return null; // passiert eh nich ...
	}

	public int gibZielPosX()
	{
		int ret = (int) posX;
		for (Befehl befehl : weg)
		{
			if (befehl.art.equals("laufen"))
			{
				ret = befehl.x;
			}
		}
		return ret;
	}

	public int gibZielPosY()
	{
		int ret = (int) posY;
		for (Befehl befehl : weg)
		{
			if (befehl.art.equals("laufen"))
			{
				ret = befehl.y;
			}
		}
		return ret;
	}
}
