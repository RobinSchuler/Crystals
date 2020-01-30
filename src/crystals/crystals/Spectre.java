/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.io.IOException;
import java.util.ArrayList;


public class Spectre extends Kreatur
{
	private static final long serialVersionUID = -967237714533783627L;

	public Spectre(int x, int y)
	{
		super(x, y);
		init();
	}

	public Spectre()
	{
		init();
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

	private void init()
	{
		drectionlastmoved = 's';
		ruestung = 0;
		maxLeben = 3;
		leben = 3;
		laufgeschwindigkeit = 0.002f;
		angriffszeit = 1.2f;
		abbauzeit = 0;
		schaden = 12;
		regenerationszeit = 50;

		loadSprite("spectre");

	}

	@Override
	public void loadSprite(String name)
	{
		standN = Welt.bildLaden(name + "stehen.png");
		standS = standN;
		standO = standN;
		standW = standN;
		laufenN = Welt.bildLaden(name + "laufen.png");;
		laufenS = laufenN;
		laufenO = laufenN;
		laufenW = laufenN;
		kampf = Welt.bildLaden(name + "kampf.png");
	}

	@Override
	public void levelup()
	{
		level++;
		maxLeben += 1;
		leben += 1;
		angriffszeit *= 0.95f;
		schaden *= 1.16f;
	}
}
