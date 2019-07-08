/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.io.IOException;
import java.util.ArrayList;

/**
 * 
 * @author Bernd
 */
public class Auge extends Kreatur
{
	private static final long serialVersionUID = -425407678033144865L;

	public Auge(int x, int y)
	{
		super(x, y);
		init();
	}

	public Auge()
	{
		init();
	}

	private void init()
	{
		drectionlastmoved = 's';
		ruestung = 0;
		maxLeben = 20;
		leben = 20;
		laufgeschwindigkeit = 0.00095f;
		angriffszeit = 1f;
		abbauzeit = 10;
		schaden = 3;
		regenerationszeit = 20;
		loadSprite("auge");
	}

	@Override
	public void loadSprite(String name)
	{
		standN = Welt.bildLaden(name + ".png");
		standS = standN;
		standO = standN;
		standW = standN;
		laufenN = Welt.bildLaden(name + "laufen.png");
		laufenS = laufenN;
		laufenO = laufenN;
		laufenW = laufenN;
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
		init();
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
	}

	@Override
	public void levelup()
	{
		level++;
		maxLeben *= 1.2f;
		leben *= 1.2f;
		schaden += 2;
		regenerationszeit *= 0.95f;
		angriffszeit *= 0.9f;
	}

}
